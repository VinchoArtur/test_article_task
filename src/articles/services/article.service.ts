import {
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { Article } from '../entities/article.entity';
import { CreateArticleDto } from '../dto/create-article.dto';
import { QueryArticleDto } from '../dto/query-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 10;
  private readonly MIN_PAGE = 1;
  private readonly MIN_LIMIT = 1;
  private readonly MAX_LIMIT = 100;

  private readonly CACHE_TTL = 3600;

  private readonly CACHE_PREFIX = 'articles';
  private readonly LIST_CACHE_PATTERN = 'articles:list:*';

  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Создает новую статью
   */
  async create(
    createArticleDto: CreateArticleDto,
    author: User,
  ): Promise<Article> {
    this.logger.log(`Creating article: ${createArticleDto.title}`, {
      authorId: author.id,
      title: createArticleDto.title,
    });

    const article = this.articlesRepository.create({
      ...createArticleDto,
      publishedAt: new Date(createArticleDto.publishedAt),
      authorId: author.id,
    });

    const savedArticle = await this.articlesRepository.save(article);

    await this.invalidateListCache();

    this.logger.log(`Article created successfully`, {
      articleId: savedArticle.id,
    });

    return savedArticle;
  }

  /**
   * Получает список статей с фильтрацией и пагинацией
   */
  async findAll(queryDto: QueryArticleDto) {
    const cacheKey = this.generateCacheKey('list', queryDto);

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for key: ${cacheKey}`);

    const {
      page = this.DEFAULT_PAGE,
      limit = this.DEFAULT_LIMIT,
      authorId,
      publishedFrom,
      publishedTo,
      search,
    } = queryDto;

    const validatedPage = Math.max(this.MIN_PAGE, page);
    const validatedLimit = Math.min(
      Math.max(this.MIN_LIMIT, limit),
      this.MAX_LIMIT,
    );
    const skip = (validatedPage - this.MIN_PAGE) * validatedLimit;

    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .skip(skip)
      .take(validatedLimit)
      .orderBy('article.publishedAt', 'DESC');

    if (authorId) {
      queryBuilder.andWhere('article.authorId = :authorId', { authorId });
    }

    if (publishedFrom && publishedTo) {
      queryBuilder.andWhere('article.publishedAt BETWEEN :from AND :to', {
        from: publishedFrom,
        to: publishedTo,
      });
    } else if (publishedFrom) {
      queryBuilder.andWhere('article.publishedAt >= :from', {
        from: publishedFrom,
      });
    } else if (publishedTo) {
      queryBuilder.andWhere('article.publishedAt <= :to', {
        to: publishedTo,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(article.title ILIKE :search OR article.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [articles, total] = await queryBuilder.getManyAndCount();

    const result = {
      articles,
      total,
      page: validatedPage,
      pages: Math.ceil(total / validatedLimit),
      hasNext: validatedPage * validatedLimit < total,
      hasPrev: validatedPage > this.MIN_PAGE,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    this.logger.debug(`Cached result for key: ${cacheKey}`);

    return result;
  }

  /**
   * Получает статью по ID
   */
  async findOne(id: string): Promise<Article> {
    const cacheKey = this.generateCacheKey('article', { id });

    const cached = await this.cacheManager.get<Article>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for article: ${id}`);
      return cached;
    }

    this.logger.debug(`Cache miss for article: ${id}`);

    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      this.logger.warn(`Article not found: ${id}`);
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, article, this.CACHE_TTL);

    this.logger.debug(`Cached article: ${id}`);

    return article;
  }

  /**
   * Обновляет статью
   */
  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    user: User,
  ): Promise<Article> {
    this.logger.log(`Updating article: ${id}`, {
      userId: user.id,
      updates: Object.keys(updateArticleDto),
    });

    const article = await this.findOne(id);

    if (article.authorId !== user.id) {
      this.logger.warn(`Unauthorized update attempt`, {
        articleId: id,
        articleAuthor: article.authorId,
        requestUser: user.id,
      });
      throw new ForbiddenException('You can only update your own articles');
    }

    const updatedData: Partial<Article> = {};

    if (updateArticleDto.title) {
      updatedData.title = updateArticleDto.title;
    }

    if (updateArticleDto.description) {
      updatedData.description = updateArticleDto.description;
    }

    if (updateArticleDto.publishedAt) {
      updatedData.publishedAt = new Date(updateArticleDto.publishedAt);
    }

    await this.articlesRepository.update(id, updatedData);

    await this.invalidateCache(id);

    this.logger.log(`Article updated successfully: ${id}`);

    return this.findOne(id);
  }

  /**
   * Удаляет статью
   */
  async remove(id: string, user: User): Promise<void> {
    this.logger.log(`Deleting article: ${id}`, { userId: user.id });

    const article = await this.findOne(id);

    if (article.authorId !== user.id) {
      this.logger.warn(`Unauthorized delete attempt`, {
        articleId: id,
        articleAuthor: article.authorId,
        requestUser: user.id,
      });
      throw new ForbiddenException('You can only delete your own articles');
    }

    await this.articlesRepository.delete(id);

    await this.invalidateCache(id);

    this.logger.log(`Article deleted successfully: ${id}`);
  }

  /**
   * Генерирует консистентный ключ кэша
   */
  private generateCacheKey(prefix: string, params: object): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(sortedParams).digest('hex');
    return `${this.CACHE_PREFIX}:${prefix}:${hash}`;
  }

  /**
   * Инвалидирует кэш для конкретной статьи
   */
  private async invalidateCache(articleId: string): Promise<void> {
    try {
      const articleCacheKey = this.generateCacheKey('article', {
        id: articleId,
      });
      await this.cacheManager.del(articleCacheKey);

      this.logger.debug(`Invalidated cache for article: ${articleId}`);

      await this.invalidateListCache();
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for article ${articleId}`,
        error,
      );
    }
  }

  /**
   * Инвалидирует кэш списков статей
   */
  private async invalidateListCache(): Promise<void> {
    try {
      const store = (this.cacheManager as any).store;

      if (store && typeof store.keys === 'function') {
        const keys: string[] = await store.keys(this.LIST_CACHE_PATTERN);

        if (Array.isArray(keys) && keys.length > 0) {
          for (const key of keys) {
            await this.cacheManager.del(key);
          }
          this.logger.debug(`Invalidated ${keys.length} list cache keys`);
        }
      } else {
        this.logger.warn(
          'Cache store does not support keys() method, cannot invalidate list cache',
        );
      }
    } catch (error) {
      this.logger.error('Error invalidating list cache', error);
    }
  }
}
