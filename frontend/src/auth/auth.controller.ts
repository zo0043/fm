import { Controller, Post, Body, Get, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 限制注册频率
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return {
      success: true,
      message: '注册成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(
    @Body() loginDto: LoginDto,
    @User() user: any,
  ) {
    const token = this.authService.login(user);
    return {
      success: true,
      message: '登录成功',
      data: {
        access_token: token.access_token,
        expires_in: token.expires_in,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户信息' })
  async getProfile(@User() user: any) {
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新Token' })
  async refreshToken(@User() user: any) {
    const token = this.authService.login(user);
    return {
      success: true,
      data: {
        access_token: token.access_token,
        expires_in: token.expires_in,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  async logout(@Req() req: Request) {
    // 在实际应用中，这里可以将token加入黑名单
    req.session.destroy();
    return {
      success: true,
      message: '登出成功',
    };
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '验证邮箱' })
  async verifyEmail(@Body() body: { token: string }) {
    try {
      await this.authService.verifyEmail(body.token);
      return {
        success: true,
        message: '邮箱验证成功',
      };
    } catch (error) {
      throw new HttpException(
        error.message || '邮箱验证失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 5分钟内最多3次
  @ApiOperation({ summary: '忘记密码' })
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.authService.sendPasswordResetEmail(body.email);
      return {
        success: true,
        message: '密码重置邮件已发送',
      };
    } catch (error) {
      throw new HttpException(
        error.message || '发送重置邮件失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('reset-password')
  @ApiOperation({ summary: '重置密码' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      return {
        success: true,
        message: '密码重置成功',
      };
    } catch (error) {
      throw new HttpException(
        error.message || '密码重置失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  async changePassword(
    @User() user: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    try {
      await this.authService.changePassword(user.id, body.oldPassword, body.newPassword);
      return {
        success: true,
        message: '密码修改成功',
      };
    } catch (error) {
      throw new HttpException(
        error.message || '密码修改失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}