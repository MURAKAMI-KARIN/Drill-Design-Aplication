import { prisma } from "../db/prisma";

export const positionRepository = {
  async findBySetId(setId: number) {
    return prisma.position.findMany({
      where: { setId },
    });
  },

  async createMany(data: Array<{ memberId: number; setId: number; x: number; y: number }>) {
    return prisma.position.createMany({
      data,
    });
  },

  async upsert(memberId: number, setId: number, x: number, y: number) {
    return prisma.position.upsert({
      where: {
        memberId_setId: {
          memberId,
          setId,
        },
      },
      update: {
        x,
        y,
      },
      create: {
        memberId,
        setId,
        x,
        y,
      },
    });
  },

  async update(id: number, data: { x?: number; y?: number }) {
    return prisma.position.update({
      where: { id },
      data,
    });
  },
};
