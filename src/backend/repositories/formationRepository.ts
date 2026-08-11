import { prisma } from "../db/prisma";

export const formationRepository = {
  async findAll() {
    return prisma.formation.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: number) {
    return prisma.formation.findUnique({
      where: { id },
      include: {
        sets: {
          orderBy: { number: "asc" },
          include: {
            positions: true,
          },
        },
      },
    });
  },

  async create(
    title: string,
    music: string = "",
    bpm: number = 120,
    style?: {
      fieldWidth?: number;
      fieldHeight?: number;
      markingShape?: string;
      backgroundColor?: string;
      markerColor?: string;
      showYardLines?: boolean;
      showYardNumbers?: boolean;
      showGridLines?: boolean;
      customMarkers?: string;
    }
  ) {
    return prisma.formation.create({
      data: {
        title,
        music,
        bpm,
        fieldWidth: style?.fieldWidth,
        fieldHeight: style?.fieldHeight,
        markingShape: style?.markingShape,
        backgroundColor: style?.backgroundColor,
        markerColor: style?.markerColor,
        showYardLines: style?.showYardLines,
        showYardNumbers: style?.showYardNumbers,
        showGridLines: style?.showGridLines,
        customMarkers: style?.customMarkers,
        sets: {
          create: [
            {
              number: 0,
              counts: 8,
            },
            {
              number: 1,
              counts: 16,
            },
          ],
        },
      },
      include: {
        sets: true,
      },
    });
  },

  async delete(id: number) {
    try {
      const sets = await prisma.set.findMany({ where: { formationId: id } });
      const setIds = sets.map((s) => s.id);
      if (setIds.length > 0) {
        await prisma.position.deleteMany({
          where: { setId: { in: setIds } },
        });
        await prisma.set.deleteMany({
          where: { formationId: id },
        });
      }
      return await prisma.formation.delete({
        where: { id },
      });
    } catch (e) {
      console.error("Failed to delete formation in repository:", e);
      return null;
    }
  },

  async update(id: number, data: {
    title?: string;
    music?: string;
    bpm?: number;
    fieldWidth?: number;
    fieldHeight?: number;
    markingShape?: string;
    markingIntervalX?: number;
    markingIntervalY?: number;
    markingCountX?: number;
    markingCountY?: number;
    backgroundColor?: string;
    markerColor?: string;
    showYardLines?: boolean;
    showYardNumbers?: boolean;
    showGridLines?: boolean;
    customMarkers?: string;
  }) {
    return prisma.formation.update({
      where: { id },
      data,
    });
  },
};
