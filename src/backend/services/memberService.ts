import { memberRepository } from "../repositories/memberRepository";
import { setRepository } from "../repositories/setRepository";
import { positionRepository } from "../repositories/positionRepository";

export const memberService = {
  async getMembers() {
    return memberRepository.findAll();
  },

  async createMember(name: string, instrument: string, color?: string, formationId?: number) {
    const newMember = await memberRepository.create(name, instrument, color);

    if (formationId) {
      const sets = await setRepository.findByFormationId(formationId);
      if (sets.length > 0) {
        const initialPositions = sets.map((s) => ({
          memberId: newMember.id,
          setId: s.id,
          x: 0.5, // Center coordinates (0.5, 0.5)
          y: 0.5,
        }));
        await positionRepository.createMany(initialPositions);
      }
    }

    return newMember;
  },

  async updateMember(id: number, data: { name?: string; instrument?: string; color?: string }) {
    return memberRepository.update(id, data);
  },

  async deleteMember(id: number) {
    return memberRepository.delete(id);
  },
};
