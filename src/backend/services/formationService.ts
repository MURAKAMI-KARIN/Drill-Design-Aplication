import { formationRepository } from "../repositories/formationRepository";
import { memberRepository } from "../repositories/memberRepository";
import { setRepository } from "../repositories/setRepository";
import { positionRepository } from "../repositories/positionRepository";
import { prisma } from "../db/prisma";

export const formationService = {
  async getFormations() {
    const formations = await formationRepository.findAll();
    return formations.map((f) => ({
      ...f,
      customMarkers: f.customMarkers ? JSON.parse(f.customMarkers) : [],
    }));
  },

  async getFormationDetails(id: number) {
    const formation = await formationRepository.findById(id);
    if (!formation) {
      return null;
    }
    const parsedFormation = {
      ...formation,
      customMarkers: formation.customMarkers ? JSON.parse(formation.customMarkers) : [],
    };
    const members = await memberRepository.findAll();
    return { formation: parsedFormation, members };
  },

  async createFormation(
    title: string,
    music?: string,
    bpm?: number,
    style?: {
      fieldWidth?: number;
      fieldHeight?: number;
      markingShape?: string;
      backgroundColor?: string;
      markerColor?: string;
      showYardLines?: boolean;
      showYardNumbers?: boolean;
      showGridLines?: boolean;
      customMarkers?: any[];
    }
  ) {
    const serializedStyle = style ? {
      ...style,
      customMarkers: style.customMarkers ? JSON.stringify(style.customMarkers) : undefined,
    } : undefined;
    return formationRepository.create(title, music, bpm, serializedStyle);
  },

  async deleteFormation(id: number) {
    const existing = await prisma.formation.findUnique({ where: { id } });
    if (!existing) return null;
    return formationRepository.delete(id);
  },

  async saveFormationEntire(
    formationId: number,
    payload: {
      title: string;
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
      customMarkers?: any[];
      sets?: Array<{ id: number; counts?: number; bpm?: number | null; positions?: Array<{ memberId: number | string; x: number | string; y: number | string }> }>;
      members?: Array<{ id: number; name: string; instrument: string; color?: string }>;
    }
  ) {
    const formationData = {
      title: payload.title || "Untitled Formation",
      music: payload.music || "",
      bpm: payload.bpm ? parseInt(payload.bpm as any) : 120,
      fieldWidth: payload.fieldWidth ? parseInt(payload.fieldWidth as any) : 150,
      fieldHeight: payload.fieldHeight ? parseInt(payload.fieldHeight as any) : 150,
      markingShape: payload.markingShape || "cross",
      markingIntervalX: payload.markingIntervalX ? parseInt(payload.markingIntervalX as any) : 10,
      markingIntervalY: payload.markingIntervalY ? parseInt(payload.markingIntervalY as any) : 10,
      markingCountX: payload.markingCountX ? parseInt(payload.markingCountX as any) : 15,
      markingCountY: payload.markingCountY ? parseInt(payload.markingCountY as any) : 15,
      backgroundColor: payload.backgroundColor,
      markerColor: payload.markerColor,
      showYardLines: payload.showYardLines,
      showYardNumbers: payload.showYardNumbers,
      showGridLines: payload.showGridLines,
      customMarkers: payload.customMarkers ? JSON.stringify(payload.customMarkers) : undefined,
    };

    // 1. Update basic formation info if exists, or create if missing
    const existingFormation = await prisma.formation.findUnique({ where: { id: formationId } });
    if (existingFormation) {
      await formationRepository.update(formationId, formationData);
    } else {
      await prisma.formation.create({
        data: {
          id: formationId,
          ...formationData,
        },
      });
    }

    // 2. Update/create members if present
    if (payload.members && Array.isArray(payload.members)) {
      for (const m of payload.members) {
        const mId = typeof m.id === "number" ? m.id : parseInt(m.id as any);
        if (!isNaN(mId) && mId > 0) {
          const existingMember = await prisma.member.findUnique({ where: { id: mId } });
          if (existingMember) {
            await memberRepository.update(mId, {
              name: m.name,
              instrument: m.instrument,
              color: m.color,
            });
          } else {
            await prisma.member.create({
              data: {
                id: mId,
                name: m.name || `Member ${mId}`,
                instrument: m.instrument || "",
                color: m.color || "#3B82F6",
              },
            });
          }
        } else if (m.name) {
          await memberRepository.create(m.name, m.instrument || "", m.color || "#3B82F6");
        }
      }
    }

    // 3. Update/create sets and positions
    if (payload.sets && Array.isArray(payload.sets)) {
      for (let index = 0; index < payload.sets.length; index++) {
        const s = payload.sets[index];
        const setId = typeof s.id === "number" ? s.id : parseInt(s.id as any);
        let validSetId: number | null = null;

        if (!isNaN(setId) && setId > 0) {
          const existingSet = await prisma.set.findUnique({ where: { id: setId } });
          if (existingSet) {
            await setRepository.update(setId, {
              counts: s.counts ? parseInt(s.counts as any) : 16,
              bpm: s.bpm !== undefined ? (s.bpm ? parseInt(s.bpm as any) : null) : undefined,
            });
            validSetId = setId;
          } else {
            const createdSet = await prisma.set.create({
              data: {
                id: setId,
                formationId,
                number: index + 1,
                counts: s.counts ? parseInt(s.counts as any) : 16,
                bpm: s.bpm ? parseInt(s.bpm as any) : null,
              },
            });
            validSetId = createdSet.id;
          }
        } else {
          const createdSet = await prisma.set.create({
            data: {
              formationId,
              number: index + 1,
              counts: s.counts ? parseInt(s.counts as any) : 16,
              bpm: s.bpm ? parseInt(s.bpm as any) : null,
            },
          });
          validSetId = createdSet.id;
        }

        if (validSetId && s.positions && Array.isArray(s.positions)) {
          for (const pos of s.positions) {
            const memberId = parseInt(pos.memberId as any);
            if (!isNaN(memberId) && memberId > 0) {
              const memberExists = await prisma.member.findUnique({ where: { id: memberId } });
              if (memberExists) {
                try {
                  await positionRepository.upsert(
                    memberId,
                    validSetId,
                    parseFloat(pos.x as any) || 0,
                    parseFloat(pos.y as any) || 0
                  );
                } catch (posErr) {
                  console.warn(`Failed position upsert (memberId=${memberId}, setId=${validSetId}):`, posErr);
                }
              }
            }
          }
        }
      }
    }

    return { success: true };
  },
};
