import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ArticlesService } from '../services/article.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateArticleDto } from '../dto/create-article.dto';
import { User } from '../../users/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { QueryArticleDto } from '../dto/query-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import {
  ArticleResponseDto,
  PaginatedArticlesResponseDto,
} from '../dto/article-response.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiOperation({
    summary: 'Create a new article',
    description: 'Creates a new article. Requires authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Article created successfully',
    type: ArticleResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.create(createArticleDto, user);
  }

  @ApiOperation({
    summary: 'Get all articles',
    description:
      'Retrieves a paginated list of articles with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'NestJS',
  })
  @ApiQuery({ name: 'authorId', required: false, type: String })
  @ApiQuery({ name: 'publishedFrom', required: false, type: String })
  @ApiQuery({ name: 'publishedTo', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Articles retrieved successfully',
    type: PaginatedArticlesResponseDto,
  })
  @Get()
  findAll(@Query() query: QueryArticleDto) {
    return this.articlesService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get article by ID',
    description: 'Retrieves a single article by its UUID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({
    status: 200,
    description: 'Article retrieved successfully',
    type: ArticleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update article',
    description:
      'Updates an existing article. Only the author can update their own articles.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
    type: ArticleResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Not authorized to update this article',
  })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.update(id, updateArticleDto, user);
  }

  @ApiOperation({
    summary: 'Delete article',
    description:
      'Deletes an article. Only the author can delete their own articles.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Not authorized to delete this article',
  })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.articlesService.remove(id, user);
  }
}
