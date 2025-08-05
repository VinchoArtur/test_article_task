import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsUUID,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryArticleDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of articles per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by author ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsOptional()
  @IsString({ message: 'Author ID must be a string' })
  @IsUUID(4, { message: 'Author ID must be a valid UUID' })
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Filter articles published from this date (inclusive)',
    example: '2025-01-01T00:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'publishedFrom must be a valid ISO 8601 date string' },
  )
  publishedFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter articles published until this date (inclusive)',
    example: '2025-12-31T23:59:59Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'publishedTo must be a valid ISO 8601 date string' },
  )
  publishedTo?: string;

  @ApiPropertyOptional({
    description: 'Search in article title and description',
    example: 'NestJS tutorial',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @Length(2, 100, {
    message: 'Search term must be between 2 and 100 characters',
  })
  search?: string;
}
