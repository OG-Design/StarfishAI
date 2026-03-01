import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";


// checks for session
@Injectable()
export class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {

        if (process.env.ELECTRON_MODE === 'true') {
            return true; // Disable auth for Electron
        }

        const req = context.switchToHttp().getRequest();
        if (!req.session?.user) {
            throw new UnauthorizedException('Not authenticated');
        }

        return true;
    }
}