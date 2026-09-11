import { Injectable } from '@nestjs/common';

type UserInfo = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

@Injectable()
export class AiUserService {
  private readonly database = new Map<string, UserInfo>([
    [
      '1',
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St, Anytown, USA',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      },
    ],
    [
      '2',
      {
        id: '2',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '0987654321',
        address: '456 Main St, Anytown, USA',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      },
    ],
    [
      '3',
      {
        id: '3',
        name: 'Jim Beam',
        email: 'jim.beam@example.com',
        phone: '1111111111',
        address: '789 Main St, Anytown, USA',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      },
    ],
    [
      '4',
      {
        id: '4',
        name: 'Jill Smith',
        email: 'jill.smith@example.com',
        phone: '2222222222',
        address: '101 Main St, Anytown, USA',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      },
    ],
  ]);

  getUserInfo(userId: string) {
    return this.database.get(userId);
  }

  findAll(): UserInfo[] {
    return Array.from(this.database.values());
  }

  findOne(id: string): UserInfo | undefined {
    return this.database.get(id);
  }

  create(user: UserInfo): UserInfo {
    this.database.set(user.id, user);
    return user;
  }

  update(id: string, user: UserInfo): UserInfo {
    this.database.set(id, user);
    return user;
  }

  delete(id: string): void {
    this.database.delete(id);
  }
}
