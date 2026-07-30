import { setRepository } from "../repositories/setRepository";
import { positionRepository } from "../repositories/positionRepository";

export const setService = {
  async getSets(formationId: number) {
    return setRepository.findByFormationId(formationId);
  },

  async createSet(formationId: number, counts?: number) {
    const lastSet = await setRepository.findFirstDesc(formationId);
    const nextNumber = lastSet !== null && lastSet !== undefined ? lastSet.number + 1 : 0;

    const newSet = await setRepository.create(formationId, nextNumber, counts);

    if (lastSet) {
      const prevPositions = await positionRepository.findBySetId(lastSet.id);
      if (prevPositions.length > 0) {
        await positionRepository.createMany(
          prevPositions.map((p) => ({
            memberId: p.memberId,
            setId: newSet.id,
            x: p.x,
            y: p.y,
          }))
        );
      }
    }

    return setRepository.findById(newSet.id);
  },

  async duplicateSet(sourceSetId: number) {
    const sourceSet = await setRepository.findById(sourceSetId);
    if (!sourceSet) {
      return null;
    }

    const lastSet = await setRepository.findFirstDesc(sourceSet.formationId);
    const nextNumber = lastSet !== null && lastSet !== undefined ? lastSet.number + 1 : 0;

    const newSet = await setRepository.create(sourceSet.formationId, nextNumber, sourceSet.counts);

    if (sourceSet.positions.length > 0) {
      await positionRepository.createMany(
        sourceSet.positions.map((p) => ({
          memberId: p.memberId,
          setId: newSet.id,
          x: p.x,
          y: p.y,
        }))
      );
    }

    return setRepository.findById(newSet.id);
  },

  async deleteSet(id: number) {
    const deletedSet = await setRepository.findById(id);
    if (!deletedSet) {
      return null;
    }

    await setRepository.delete(id);

    // Re-number remaining sets sequentially starting from 0
    const remainingSets = await setRepository.findByFormationId(deletedSet.formationId);
    for (let i = 0; i < remainingSets.length; i++) {
      await setRepository.update(remainingSets[i].id, { number: i });
    }

    return { success: true };
  },

  async updateSet(id: number, data: { number?: number; counts?: number; bpm?: number }) {
    return setRepository.update(id, data);
  },
};
