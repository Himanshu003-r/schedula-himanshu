import { IsEmail, IsString, MinLength } from "class-validator"

export class LoginUserDto {

    @IsEmail({},{message: 'Enter a valid email'})
    email: string

    @IsString()
    @MinLength(6,{message: 'Password must be 6 character long'})
    password: string
}