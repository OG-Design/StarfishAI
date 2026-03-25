import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class UserFileGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by AuthGuard
    const { idUser } = request.params; // Or from query/body/path

    if (!user || user.idUser !== Number(idUser)) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
