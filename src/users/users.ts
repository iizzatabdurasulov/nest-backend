export type Role = 'owner' | 'admin';

export interface User {
  id: string;
  email: string;
  roles: Role;
}
// JwtStrategy.validate() qaytaradigan req.user
export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

const hello = (name: string, age: number) => {
  if (name == 'izzat' && age == 21) {
    console.log(`Hello ${name}`);
  }
};

let name = 'izzat';
let age = 21;

console.log(hello(name, age));
