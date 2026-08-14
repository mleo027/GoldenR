import { describe, expect, it } from 'vitest';
import { createEmptyCase, createEmptyProject } from '../../constants/workspace';
import { findCaseLocation } from './openCaseTabs';
import { moveCaseInProjects } from './moveCase';

function createProject(name: string, caseCount: number) {
    const project = createEmptyProject(1);
    project.name = name;
    project.cases = Array.from({ length: caseCount }, (_, index) => {
        const item = createEmptyCase(index + 1);
        item.name = `${name}-case-${index + 1}`;
        item.address = `KSPB.${1000 + index}`;
        return item;
    });
    return project;
}

describe('moveCaseInProjects', () => {
    it('moves case to another project and re-sorts by msgtype', () => {
        const projects = [createProject('A', 2), createProject('B', 1)];
        const movedCaseId = projects[0].cases[1].id;

        const result = moveCaseInProjects(projects, {
            fromProjectIndex: 0,
            fromCaseIndex: 1,
            toProjectIndex: 1,
        });

        expect(result).not.toBeNull();
        expect(result?.projects[0].cases).toHaveLength(1);
        expect(result?.projects[1].cases).toHaveLength(2);
        expect(findCaseLocation(result!.projects, movedCaseId)).toEqual({
            projectIndex: 1,
            caseIndex: expect.any(Number),
        });
    });

    it('removes source project when moving its only case', () => {
        const projects = [createProject('A', 1), createProject('B', 1)];
        const movedCaseId = projects[0].cases[0].id;

        const result = moveCaseInProjects(projects, {
            fromProjectIndex: 0,
            fromCaseIndex: 0,
            toProjectIndex: 1,
        });

        expect(result?.removedSourceProject).toBe(true);
        expect(result?.projects).toHaveLength(1);
        expect(result?.projects[0].name).toBe('B');
        expect(findCaseLocation(result!.projects, movedCaseId)).toEqual({
            projectIndex: 0,
            caseIndex: expect.any(Number),
        });
    });

    it('adjusts target project index after removing an earlier source project', () => {
        const projects = [createProject('A', 1), createProject('B', 1), createProject('C', 1)];
        const movedCaseId = projects[0].cases[0].id;

        const result = moveCaseInProjects(projects, {
            fromProjectIndex: 0,
            fromCaseIndex: 0,
            toProjectIndex: 2,
        });

        expect(result?.removedSourceProject).toBe(true);
        expect(result?.projects).toHaveLength(2);
        expect(result?.adjustedToProjectIndex).toBe(1);
        expect(findCaseLocation(result!.projects, movedCaseId)).toEqual({
            projectIndex: 1,
            caseIndex: expect.any(Number),
        });
        expect(result?.projects[1].name).toBe('C');
    });

    it('returns null for invalid move targets', () => {
        const projects = [createProject('A', 1)];
        expect(
            moveCaseInProjects(projects, {
                fromProjectIndex: 0,
                fromCaseIndex: 0,
                toProjectIndex: 0,
            }),
        ).toBeNull();
        expect(
            moveCaseInProjects(projects, {
                fromProjectIndex: 0,
                fromCaseIndex: 9,
                toProjectIndex: 0,
            }),
        ).toBeNull();
    });
});
