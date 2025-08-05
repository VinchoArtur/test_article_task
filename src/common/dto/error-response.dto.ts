import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  message: string;

  @ApiProperty({ example: '2025-01-15T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/articles' })
  path: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    example: ['title must not be empty', 'email must be a valid email'],
    description: 'Array of validation error messages',
  })
  message: string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
