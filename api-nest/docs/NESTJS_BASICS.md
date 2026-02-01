# **How it works**

This is an overview of how the API works, this does not show each route in the API, only the root `/`. 

## Route */*

### *./src/app.controller.ts*
```ts
// ./src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';



@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

}
```

### **Imports**

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
```

These are imports, they are here to give context to the code below. `@Get()` & `@Controller()` are decorators borrowed from the nestjs module named `common`. `AppService` is another typescript file from the same folder, it is used as a constructor to give the `@Get()` route something to do.


### **The route** */*


```ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

}
```

This is where route */* is handled in the API, aswell as the route types: GET, POST, PUT etc. since the *@Controller()* is empty, it serves from the root or */*.

### Example
You could input the controller like this

```ts
@Controller('/location')
```

And it would serve

```ts
getHello()
```

at */location* instead. You can also do this with *@Get* and *@Post* etc.


### The constructor

```ts
constructor(private readonly appService: AppService) {}
```

This is a constructor, it gets the import *AppService* and makes it private, readonly, and redefines it as *appService* inside the scope of the class. What this means is that the *private* property keeps it within the class it is constructed in, the *readonly* keeps it from being written after construction, and makes *AppService* callable as *appService* inside the scope of the class.


### The *@Get* decorator

```ts
@Get()
getHello(): string {
  return this.appService.getHello();
}
```

The `@Get()` descriptor is responsible for serving a get request, in this case it is the root route of `/`. So if a request is made to the API at `/` it would respond with the `getHello()` function's response.

The method body:
```ts
this.appService.getHello();
```
This references the constructor and so the calls the `getHello()` function.


### app.service.ts

### How the *getHello()* function works
The function is imported as shown above and is inside `./src/app.service.ts`, which looks like this:

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

```

Injectable is imported from the nestjs common package like this. This is imported to help "Inject" the class `AppService`.

```ts
import { Injectable } from '@nestjs/common';

```

This is the function `getHello()`. It simply returns 'Hello World!', this is what the `app.controller.ts` references in it's `@Get` decorator

```ts
getHello(): string {
  return 'Hello World!';
}

```

### app.module.ts

This organizes the scripts so *nestjs* understands it.

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UserModule, AuthModule],
  controllers: [AppController, UserController, AuthController],
  providers: [AppService, UserService, AuthService],
})
export class AppModule {}

```

