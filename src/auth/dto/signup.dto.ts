import { Transform } from 'class-transformer'
import {IsEmail, IsEnum, IsString, MinLength} from 'class-validator'
import { UserRole } from 'src/users/entities/user.entity'
export class SignUpUserDto {

    @Transform(({value})=>value.trim())
    @IsEmail({},{message: 'Please provide a valid email'})
    email: string
 
    @IsString()
    @MinLength(6,{message: 'Password must be 6 character long'})
    password: string

    @IsString()
    name: string

    @IsEnum(UserRole)
    role: UserRole
}