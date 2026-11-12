import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import ky from 'ky';

interface CurrencyResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

@Injectable()
export class CurrencyService {
  async getRate(from: string, to: string) {
  const data = await ky
    .get(`https://open.er-api.com/v6/latest/${from}`)
    .json<CurrencyResponse>();

  return data.rates[to];
}
}
