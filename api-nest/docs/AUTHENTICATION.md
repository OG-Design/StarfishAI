# **Authentication**

## Session
The session handler is responsible for handling sessions, it is used to keep data on authenticated user sessions, and prevent unauthenticated access through the *guard* logic shown further down.

### ./src/main.ts
```ts
// ./src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(session({
    secret: "0", // replace
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 3600000*24
    }
  }))

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### The session setup

This imports session from *express-session*

```ts
import session from 'express-session';
```

The code below initializes and uses the `session` variable. `app.use` tells the `NestFactory` or `app` to use `express-session` as a global session handler. Look at the comments of the session object for an explanation of what they do

```ts
app.use(session({
  secret: "0", // replace
  resave: false,
  saveUninitialized: false, // ensures that unauthenticated sessions don't exist
  cookie: {
    httpOnly: true, // prevents access from clientside js
    secure: false, // true | false == https | http
    maxAge: 3600000*24 // time 1 day, the maximum age of a session
  }
}))
```

## The controller

This is responsible for the route `/auth`, it handles login and logout route requests. The logout is also responsible for destroying the session if it exists.

### ./src/auth/auth.controller.ts
```ts
// ./src/auth/auth.controller.ts
import { Controller, Post, Body, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}


    // handles route for login
    @Post('login')
    login (@Body() body:  {username: string, password: string}, @Req() req: Request, @Res() res: Response) {
        const user: any = this.authService.validateUser(body.username, body.password);

        // if no session
        if (!user) {
            console.log(user)
            return res.status(401).json({ message: 'Invalid credentials'});
        }

        // save session with user info
        req.session.user=user;

        return res.json({ message: "Logged in successfully" });
    }

    // handles route and logout by session destruction
    @Post('logout')
    logout(@Req() req: Request, @Res() res: Response) {
        req.session.destroy( (err) => {
            // check for error
            if (err) {
                return res.status(500).json({ message: "Logout failed" });
            }

            // clears cookie
            res.clearCookie('sid');
            return res.json({ message: "Logged out"});

        });
    }
}

```

### The login route

The route to access login is `/auth/login` due to the controller's path. It requires a *@Body()* decorator with a body containing objects `username`, `password`. It also uses the imported `@Req()` and `Request` defined as req. Res is similarly structured.  

```ts
@Post('login')
    async login (@Body() body:  {username: string, password: string}, @Req() req: Request, @Res() res: Response) {
        const user: any = this.authService.validateUser(body.username, body.password);

        // if no session
        if (!user) {
            console.log(user)
            return res.status(401).json({ message: 'Invalid credentials'});
        }

        // save session with user info
        req.session.user=user;

        return res.json({ message: "Logged in successfully" });
    }
```

The `user` variable defines a method that uses the `authService` => `validateUser` function. The function requires two parameters `username` & `password` to validate the users credentials.

```ts
const user: any = await this.authService.validateUser(body.username, body.password);
```

The statement below checks the return value of `user`, if the user variable's credentials are incorrect it returns a response stating so.  

```ts
if (!user) {
    console.log(user)
    return res.status(401).json({ message: 'Invalid credentials'});
}
```

If the credentials are correct and the if statement proceeds it assembles a session containing some user data, which can be referenced in order to safely give access to routes. It also returns a message signaling its successful session creation.

```ts
req.session.user=user;

return res.json({ message: "Logged in successfully" });
```


### The logout route

To access this route follow the same logic as in the login route so in this case `/auth/logout`. It requires no input parameters, but defines `@Req()`, `Request`, `@Res()`, `Response` as in the login route.

```ts
@Post('logout')
logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy( (err) => {
        // check for error
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }

        // clears cookie
        res.clearCookie('sid');
        return res.json({ message: "Logged out"});

    });
}
```

This destroys the session and responds with an error if it fails.

```ts
req.session.destroy( (err) => {
  // check for error
  if (err) {
      return res.status(500).json({ message: "Logout failed" });
  }

  // clears cookie
  res.clearCookie('sid');
  return res.json({ message: "Logged out"});
});
```

## The service

The service handles most of the login logic in its `validateUser` function. its external dependencies are `bcrypt` & `better-sqlite3`.

### ./src/auth/auth.service.ts
```ts
import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

const db = new Database(process.cwd()+"/starfish.db");

const saltRounds: number = 10;



@Injectable()
export class AuthService {
    // validates user credentials
    async validateUser(username: string, password: string) {
        const user: any = db.prepare('SELECT username, hash FROM user WHERE username = ?').get(username);

        console.log("\n\n", user.username, " is logged in.\n");

        try {
            // compare password
            const isValid = await bcrypt.compare(password, user.hash);
            console.log("Login is", await isValid, "\n");

            if(!isValid) {
                throw new UnauthorizedException("Username or password incorrect");
            }

            return true;

        } catch (err) {
            console.error("error: ", err);
            throw new InternalServerErrorException("Internal server error");
        }
    }

}
```


The code below handles getting and saving the selected users data.

```ts
const user: any = db.prepare('SELECT username, hash FROM user WHERE username = ?').get(username);
```

Validation happens in the isValid variable. It uses the imported *bcrypt* package to compare the password input to the prepared `Database / db` outputs `hash`.

```ts
const isValid = await bcrypt.compare(password, user.hash);
```


To avoid unauthorized access it checks the condition of `isValid` in an if statement, if its triggered it throws a new error called an *UnauthorizedException*.

```ts
if(!isValid) {
    throw new UnauthorizedException("Username or password incorrect");
}
```

If it passes the check above, it returns a value of `true` and allows the session creation to happen as shown in `./src/auth/auth.controller.ts`.

```ts
return true;
```

## The session auth guard

The session-auth guard is responsible for checking the sessions. This is imported in the scripts requiring authentication, one example of this is inside of the `./user/user.service.ts` script. Inside the user service it is used on the `delete` route, which is responsible for deleting users from the database.

---
# **WIP**
# **Incomplete description of how it works**
---

### ./src/auth/session-auth.guard.ts

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";


// checks for session
@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();

      if (!req.session?.user) {
          throw new UnauthorizedException('Not authenticated');
      }

      return true;
  }
}
```
