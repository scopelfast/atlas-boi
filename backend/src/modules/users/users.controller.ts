import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { UsersService, type RequesterUser } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: RequesterUser, @Query("companyId") companyId?: string) {
    return this.users.findAll(user, companyId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequesterUser, @Param("id") id: string) {
    return this.users.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequesterUser, @Body() body: Parameters<UsersService["create"]>[1]) {
    return this.users.create(user, body);
  }

  @Put(":id")
  update(
    @CurrentUser() user: RequesterUser,
    @Param("id") id: string,
    @Body() body: Parameters<UsersService["update"]>[2]
  ) {
    return this.users.update(user, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequesterUser, @Param("id") id: string) {
    return this.users.remove(user, id);
  }
}
