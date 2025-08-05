import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Article title',
    example: 'Introduction to NestJS',
    minLength: 1,
    maxLength: 200,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  title: string;

  @ApiProperty({
    description: 'Article content/description',
    example:
      'This is a comprehensive guide to building scalable Node.js applications with NestJS framework, covering controllers, services, guards, and database integration.',
    minLength: 10,
    maxLength: 10000,
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @Length(10, 10000, {
    message: 'Description must be between 10 and 10000 characters',
  })
  description: string;

  @ApiProperty({
    description: 'Publication date in ISO 8601 format',
    example: '2025-01-15T10:00:00Z',
    format: 'date-time',
  })
  @IsDateString(
    {},
    { message: 'publishedAt must be a valid ISO 8601 date string' },
  )
  publishedAt: string;
}
