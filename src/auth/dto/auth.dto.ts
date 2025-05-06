import { ApiProperty } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJJosjdiajdiaiwedhwquidhiwqndijw...',
  })
  access_token: string;
}
