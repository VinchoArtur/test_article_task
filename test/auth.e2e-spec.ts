import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Article } from '../src/articles/entities/article.entity';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/exceptions/global-exception-filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let articleRepository: Repository<Article>;

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
    try {
      await articleRepository.query('DELETE FROM articles');
      await userRepository.query('DELETE FROM users');
    } catch (error) {
      console.log('Database cleanup warning:', error.message);
    }
  });

  describe('/auth/register (POST)', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(validRegisterData.email);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegisterData,
          email: 'invalid-email',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(false);
        });
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validRegisterData,
          password: '123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(false);
        });
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterData)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 409);
        });
    });
  });

  describe('/auth/login (POST)', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    beforeEach(async () => {
      try {
        await articleRepository.query('DELETE FROM articles');
        await userRepository.query('DELETE FROM users');
      } catch (error) {
        console.log('Cleanup warning:', error.message);
      }

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validLoginData,
          firstName: 'John',
          lastName: 'Doe',
        });
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(validLoginData.email);
        });
    });

    it('should return 401 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: validLoginData.password,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
        });
    });

    it('should return 401 for invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: validLoginData.email,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
        });
    });
  });
});
