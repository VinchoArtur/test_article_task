import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './article.service';
import { Article } from '../entities/article.entity';
import { User } from '../../users/entities/user.entity';
import { CreateArticleDto } from '../dto/create-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { QueryArticleDto } from '../dto/query-article.dto';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repository: Repository<Article>;
  let cacheManager: Cache;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword',
    articles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArticle: Article = {
    id: '987fcdeb-51a4-43d2-b1e5-123456789abc',
    title: 'Test Article',
    description: 'Test Description',
    publishedAt: new Date('2025-01-15T10:00:00Z'),
    authorId: mockUser.id,
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    store: {
      keys: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createArticleDto: CreateArticleDto = {
      title: 'Test Article',
      description: 'Test Description',
      publishedAt: '2025-01-15T10:00:00Z',
    };

    it('should create and return an article', async () => {
      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);
      mockCacheManager.store.keys.mockResolvedValue([]);

      const result = await service.create(createArticleDto, mockUser);

      expect(repository.create).toHaveBeenCalledWith({
        ...createArticleDto,
        publishedAt: new Date(createArticleDto.publishedAt),
        authorId: mockUser.id,
      });
      expect(repository.save).toHaveBeenCalledWith(mockArticle);
      expect(result).toEqual(mockArticle);
    });
  });

  describe('findAll', () => {
    const queryDto: QueryArticleDto = {
      page: 1,
      limit: 10,
    };

    it('should return cached result if available', async () => {
      const cachedResult = {
        articles: [mockArticle],
        total: 1,
        page: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(queryDto);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockArticle], 1]);

      const result = await service.findAll(queryDto);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('article');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'article.author',
        'author',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual({
        articles: [mockArticle],
        total: 1,
        page: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('findOne', () => {
    const articleId = '987fcdeb-51a4-43d2-b1e5-123456789abc';

    it('should return cached article if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: articleId },
        relations: ['author'],
      });
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException if article not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(articleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const articleId = '987fcdeb-51a4-43d2-b1e5-123456789abc';
    const updateDto: UpdateArticleDto = {
      title: 'Updated Title',
    };

    it('should update article if user is the author', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(mockArticle)
        .mockResolvedValueOnce({ ...mockArticle, title: 'Updated Title' });
      mockCacheManager.store.keys.mockResolvedValue([]);

      const result = await service.update(articleId, updateDto, mockUser);

      expect(repository.update).toHaveBeenCalledWith(articleId, {
        title: 'Updated Title',
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const otherUser = { ...mockUser, id: 'different-id' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);

      await expect(
        service.update(articleId, updateDto, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const articleId = '987fcdeb-51a4-43d2-b1e5-123456789abc';

    it('should delete article if user is the author', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockCacheManager.store.keys.mockResolvedValue([]);

      await service.remove(articleId, mockUser);

      expect(repository.delete).toHaveBeenCalledWith(articleId);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const otherUser = { ...mockUser, id: 'different-id' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);

      await expect(service.remove(articleId, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
