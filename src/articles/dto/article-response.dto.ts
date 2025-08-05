import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class ArticleResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Article unique identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Introduction to NestJS',
    description: 'Article title',
  })
  title: string;

  @ApiProperty({
    example:
      'This is a comprehensive guide to building scalable Node.js applications...',
    description: 'Article content',
  })
  description: string;

  @ApiProperty({
    example: '2025-01-15T10:00:00Z',
    description: 'Publication date',
  })
  publishedAt: Date;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Author ID',
  })
  authorId: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Article author information',
  })
  author: UserResponseDto;

  @ApiProperty({
    example: '2025-01-15T10:00:00Z',
    description: 'Article creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15T10:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}

export class PaginatedArticlesResponseDto {
  @ApiProperty({
    type: [ArticleResponseDto],
    description: 'Array of articles',
  })
  articles: ArticleResponseDto[];

  @ApiProperty({
    example: 25,
    description: 'Total number of articles',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 3,
    description: 'Total number of pages',
  })
  pages: number;

  @ApiProperty({
    example: true,
    description: 'Whether there is a next page',
  })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPrev: boolean;
}
