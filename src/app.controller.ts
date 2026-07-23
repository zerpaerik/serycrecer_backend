import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return { ok: true, service: 'serycrecer-api', time: new Date().toISOString() };
  }
}
