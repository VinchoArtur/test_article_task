import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Article } from '../src/articles/entities/article.entity';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/exceptions/global-exception-filter';

describe('Articles (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let articleRepository: Repository<Article>;
  let authToken: string;
  let secondAuthToken: string;
  let userId: string;
  let secondUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.setGlobalPrefix('api/v1');

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    articleRepository = moduleFixture.get<Repository<Article>>(
      getRepositoryToken(Article),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await articleRepository.query('DELETE FROM articles');
    await userRepository.query('DELETE FROM users');

    const firstUserResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'author@example.com',
        password: 'Password123!',
        firstName: 'Author',
        lastName: 'One',
      });

    authToken = firstUserResponse.body.access_token;
    userId = firstUserResponse.body.user.id;

    const secondUserResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'other@example.com',
        password: 'Password123!',
        firstName: 'Author',
        lastName: 'Two',
      });

    secondAuthToken = secondUserResponse.body.access_token;
    secondUserId = secondUserResponse.body.user.id;
  });

  describe('/articles (POST)', () => {
    const validArticleData = {
      title: 'Test Article',
      description: 'This is a comprehensive test article description',
      publishedAt: '2025-01-15T10:00:00Z',
    };

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/articles')
        .send(validArticleData)
        .expect(401);
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          description: 'short',
          publishedAt: 'invalid-date',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Only title provided',
        })
        .expect(400);
    });
  });

  describe('/articles (GET)', () => {
    beforeEach(async () => {
      const articles = [
        {
          title: 'NestJS Fundamentals',
          description: 'Learn the basics of NestJS framework development',
          publishedAt: '2025-01-10T10:00:00Z',
        },
        {
          title: 'Advanced TypeORM',
          description: 'Master advanced TypeORM techniques and patterns',
          publishedAt: '2025-01-12T14:30:00Z',
        },
        {
          title: 'Redis Caching Guide',
          description:
            'Complete guide to Redis caching in Node.js applications',
          publishedAt: '2025-01-14T09:15:00Z',
        },
      ];

      for (const articleData of articles) {
        await request(app.getHttpServer())
          .post('/api/v1/articles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(articleData);
      }
    });

    it('should return paginated articles', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('articles');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('pages');
          expect(res.body).toHaveProperty('hasNext');
          expect(res.body).toHaveProperty('hasPrev');
          expect(res.body.articles).toBeInstanceOf(Array);
          expect(res.body.total).toBe(3);
          expect(res.body.page).toBe(1);
          expect(res.body.hasNext).toBe(false);
          expect(res.body.hasPrev).toBe(false);
        });
    });

    it('should return filtered articles by search', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles?search=NestJS')
        .expect(200)
        .expect((res) => {
          expect(res.body.articles.length).toBe(1);
          expect(res.body.articles[0].title).toContain('NestJS');
        });
    });

    it('should return filtered articles by author', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/articles?authorId=${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.articles.length).toBe(3);
          res.body.articles.forEach((article: any) => {
            expect(article.authorId).toBe(userId);
          });
        });
    });

    it('should return paginated results', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles?page=1&limit=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.articles.length).toBe(2);
          expect(res.body.hasNext).toBe(true);
          expect(res.body.hasPrev).toBe(false);
        });
    });

    it('should return filtered articles by date range', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles?publishedFrom=2025-01-11&publishedTo=2025-01-13')
        .expect(200)
        .expect((res) => {
          expect(res.body.articles.length).toBe(1);
          expect(res.body.articles[0].title).toBe('Advanced TypeORM');
        });
    });

    it('should validate pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles?page=0&limit=150')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('/articles/:id (GET)', () => {
    let articleId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Single Article Test',
          description: 'Article for testing single article endpoint',
          publishedAt: '2025-01-15T10:00:00Z',
        });
      articleId = response.body.id;
    });

    it('should return article by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/articles/${articleId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(articleId);
          expect(res.body).toHaveProperty('author');
          expect(res.body.author.id).toBe(userId);
          expect(res.body.title).toBe('Single Article Test');
        });
    });

    it('should return 404 for non-existent article', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles/123e4567-e89b-12d3-a456-426614174000')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/articles/invalid-uuid')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('/articles/:id (PATCH)', () => {
    let articleId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Original Title',
          description: 'Original description for update testing',
          publishedAt: '2025-01-15T10:00:00Z',
        });
      articleId = response.body.id;
    });

    it('should update article by author', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description after patch request',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Title');
          expect(res.body.description).toBe(
            'Updated description after patch request',
          );
        });
    });

    it('should update only provided fields', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Only Title Updated',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Only Title Updated');
          expect(res.body.description).toBe(
            'Original description for update testing',
          );
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .send({
          title: 'Updated Title',
        })
        .expect(401);
    });

    it('should return 403 for non-author', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({
          title: 'Hacked Title',
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 403);
        });
    });

    it('should return 404 for non-existent article', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/articles/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        })
        .expect(404);
    });

    it('should return 400 for invalid update data', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          description: 'short',
          publishedAt: 'invalid-date',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('/articles/:id (DELETE)', () => {
    let articleId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Article to Delete',
          description: 'This article will be deleted in tests',
          publishedAt: '2025-01-15T10:00:00Z',
        });
      articleId = response.body.id;
    });

    it('should delete article by author', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/v1/articles/${articleId}`)
        .expect(404);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/articles/${articleId}`)
        .expect(401);
    });

    it('should return 403 for non-author', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 403);
        });
    });

    it('should return 404 for non-existent article', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/articles/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Cache Testing', () => {
    let articleId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Cache Test Article',
          description: 'Article for testing cache functionality',
          publishedAt: '2025-01-15T10:00:00Z',
        });
      articleId = response.body.id;
    });

    it('should cache article list requests', async () => {
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v1/articles')
        .expect(200);

      const secondResponse = await request(app.getHttpServer())
        .get('/api/v1/articles')
        .expect(200);

      expect(firstResponse.body).toEqual(secondResponse.body);
    });

    it('should invalidate cache after article update', async () => {
      const initialResponse = await request(app.getHttpServer())
        .get(`/api/v1/articles/${articleId}`)
        .expect(200);

      expect(initialResponse.body.title).toBe('Cache Test Article');

      await request(app.getHttpServer())
        .patch(`/api/v1/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Cache Test Article',
        });

      const updatedResponse = await request(app.getHttpServer())
        .get(`/api/v1/articles/${articleId}`)
        .expect(200);

      expect(updatedResponse.body.title).toBe('Updated Cache Test Article');
    });
  });
});
