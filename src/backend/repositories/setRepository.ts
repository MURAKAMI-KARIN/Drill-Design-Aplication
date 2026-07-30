import { prisma } from "../db/prisma";

export const setRepository = {
  async findByFormationId(formationId: number) {
    return prisma.set.findMany({
      where: { formationId },
      orderBy: { number: "asc" },
      include: { positions: true },
    });
  },

  async findFirstDesc(formationId: number) {
    return prisma.set.findFirst({
      where: { formationId },
      orderBy: { number: "desc" },
    });
  },

  async create(formationId: number, number: number, counts: number = 16) {
    return prisma.set.create({
      data: {
        formationId,
        number,
        counts,
      },
    });
  },

  async findById(id: number) {
    return prisma.set.findUnique({
      where: { id },
      include: { positions: true },
    });
  },

  async delete(id: number) {
    return prisma.set.delete({
      where: { id },
    });
  },

  async update(id: number, data: { number?: number; counts?: number; bpm?: number | null }) {
    return prisma.set.update({
      where: { id },
      data,
    });
  },
};
