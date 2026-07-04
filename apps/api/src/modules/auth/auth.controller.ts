import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtPayload } from "./jwt.strategy";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Request() req: { user: JwtPayload }) {
    return this.authService.me(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("change-password")
  changePassword(
    @Request() req: { user: JwtPayload },
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.authService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword
    );
  }
}
