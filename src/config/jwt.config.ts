import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret: configService.get('JWT_SECRET', 'secret'),
  signOptions: {
    expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
  },
});
