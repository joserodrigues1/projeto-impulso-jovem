import { Test, TestingModule } from '@nestjs/testing';
import { CurriculosController } from './curriculos.controller';

describe('CurriculosController', () => {
  let controller: CurriculosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurriculosController],
    }).compile();

    controller = module.get<CurriculosController>(CurriculosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
