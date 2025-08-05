import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateArticleDto {
  @ApiPropertyOptional({
    description: 'Article title',
    example: 'Updated Introduction to NestJS',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Article content/description',
    example:
      'This is an updated comprehensive guide to building scalable Node.js applications...',
    minLength: 10,
    maxLength: 10000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(10, 10000, {
    message: 'Description must be between 10 and 10000 characters',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Publication date in ISO 8601 format',
    example: '2025-01-15T14:30:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'publishedAt must be a valid ISO 8601 date string' },
  )
  publishedAt?: string;
}
