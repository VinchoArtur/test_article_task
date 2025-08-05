import {
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../users/entities/user.entity';
import { Article } from '../entities/article.entity';
import { CreateArticleDto } from '../dto/create-article.dto';
import { QueryArticleDto } from '../dto/query-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';

@Injectable()
export class ArticlesService {
  private readonly cacheKeys = new Set<string>();

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
    const article = this.articlesRepository.create({
      ...createArticleDto,
      publishedAt: new Date(createArticleDto.publishedAt),
      authorId: author.id,
    });

    const savedArticle = await this.articlesRepository.save(article);
    await this.invalidateListCache();
    return savedArticle;
  }

  /**
   * Получает список статей с фильтрацией и пагинацией
   */
  async findAll(queryDto: QueryArticleDto) {
    const cacheKey = this.generateCacheKey('list', queryDto);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const {
      page = 1,
      limit = 10,
      authorId,
      publishedFrom,
      publishedTo,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .skip(skip)
      .take(limit)
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
      queryBuilder.andWhere('article.publishedAt <= :to', { to: publishedTo });
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
      page,
      pages: Math.ceil(total / limit),
    };

    await this.cacheManager.set(cacheKey, result, 3600);
    this.cacheKeys.add(cacheKey);
    return result;
  }

  /**
   * Получает статью по ID
   */
  async findOne(id: string): Promise<Article> {
    const cacheKey = this.generateCacheKey('article', { id });
    const cached = await this.cacheManager.get<Article>(cacheKey);
    if (cached) {
      return cached;
    }

    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, article, 3600);
    this.cacheKeys.add(cacheKey);
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
    const article = await this.findOne(id);

    if (article.authorId !== user.id) {
      throw new ForbiddenException('You can only update your own articles');
    }

    const updatedData: Partial<Article> = {
      ...(updateArticleDto.title && { title: updateArticleDto.title }),
      ...(updateArticleDto.description && {
        description: updateArticleDto.description,
      }),
      ...(updateArticleDto.publishedAt && {
        publishedAt: new Date(updateArticleDto.publishedAt),
      }),
    };

    await this.articlesRepository.update(id, updatedData);
    await this.invalidateCache(id);

    return this.findOne(id);
  }

  /**
   * Удаляет статью
   */
  async remove(id: string, user: User): Promise<void> {
    const article = await this.findOne(id);

    if (article.authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own articles');
    }

    await this.articlesRepository.delete(id);
    await this.invalidateCache(id);
  }

  /**
   * Генерирует ключ кэша
   */
  private generateCacheKey(
    prefix: string,
    params: Record<string, unknown> | object,
  ): string {
    const paramString = JSON.stringify(params);
    return `${prefix}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Инвалидирует кэш для конкретной статьи
   */
  private async invalidateCache(articleId: string): Promise<void> {
    const articleCacheKey = this.generateCacheKey('article', { id: articleId });
    await this.cacheManager.del(articleCacheKey);
    this.cacheKeys.delete(articleCacheKey);
    await this.invalidateListCache();
  }

  /**
   * Инвалидирует кэш списков статей
   */
  private async invalidateListCache(): Promise<void> {
    const keysToDelete = Array.from(this.cacheKeys).filter((key) =>
      key.startsWith('list:'),
    );

    for (const key of keysToDelete) {
      await this.cacheManager.del(key);
      this.cacheKeys.delete(key);
    }
  }
}
