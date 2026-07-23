import { NotFoundException } from '@nestjs/common';

/**
 * CRUD genérico para maestros. Recibe un delegate de Prisma
 * (p.ej. prisma.servicio) y los campos por los que se busca.
 */
export abstract class BaseCrudService<
  T extends {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  },
> {
  constructor(
    protected readonly model: T,
    protected readonly searchFields: string[] = [],
    protected readonly options: {
      include?: any;
      orderBy?: any;
    } = {},
  ) {}

  findAll(search?: string) {
    const where =
      search && this.searchFields.length
        ? {
            OR: this.searchFields.map((f) => ({
              [f]: { contains: search, mode: 'insensitive' },
            })),
          }
        : undefined;
    return this.model.findMany({
      where,
      orderBy: this.options.orderBy ?? { id: 'desc' },
      include: this.options.include,
    });
  }

  async findOne(id: number) {
    const row = await this.model.findUnique({
      where: { id },
      include: this.options.include,
    });
    if (!row) throw new NotFoundException(`Registro #${id} no encontrado`);
    return row;
  }

  create(data: any) {
    return this.model.create({ data, include: this.options.include });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.model.update({
      where: { id },
      data,
      include: this.options.include,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.model.delete({ where: { id } });
    return { id, deleted: true };
  }
}
