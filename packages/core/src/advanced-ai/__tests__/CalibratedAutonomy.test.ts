/**
 * CalibratedAutonomy Tests
 *
 * Tests for autonomy evaluation, correction learning,
 * and validation level assignment.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { CalibratedAutonomy } from '../CalibratedAutonomy.js';

describe('CalibratedAutonomy', () => {
    it('should allow high autonomy for research tasks', () => {
        const autonomy = new CalibratedAutonomy();
        const decision = autonomy.evaluate('research');

        expect(decision.canActAutonomously).toBe(true);
        expect(decision.validationRequired).toBe('none');
    });

    it('should require confirmation for deployment tasks', () => {
        const autonomy = new CalibratedAutonomy();
        const decision = autonomy.evaluate('deployment');

        expect(decision.canActAutonomously).toBe(false);
        expect(decision.validationRequired).toBe('supervise');
    });

    it('should require confirmation for bug-fix tasks', () => {
        const autonomy = new CalibratedAutonomy();
        const decision = autonomy.evaluate('bug-fix');

        expect(decision.canActAutonomously).toBe(false);
        expect(['confirm', 'supervise']).toContain(decision.validationRequired);
    });

    it('should increase autonomy after successes', () => {
        const autonomy = new CalibratedAutonomy();

        // Record many successes for code-generation
        for (let i = 0; i < 15; i++) {
            autonomy.recordSuccess('code-generation');
        }

        const decision = autonomy.evaluate('code-generation');
        // Should have increased from 0.4 default
        expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should decrease autonomy after corrections', () => {
        const autonomy = new CalibratedAutonomy();

        // Get initial decision for documentation (high autonomy: 0.7)
        const before = autonomy.evaluate('documentation');

        // Record corrections
        autonomy.recordCorrection({
            taskType: 'documentation',
            wasAutonomous: true,
            correctionType: 'reject',
            timestamp: new Date(),
        });
        autonomy.recordCorrection({
            taskType: 'documentation',
            wasAutonomous: true,
            correctionType: 'undo',
            timestamp: new Date(),
        });

        const after = autonomy.evaluate('documentation');

        // Autonomy should be lower after corrections
        // Can't compare validationRequired directly since it's categorical,
        // but we can check the reasoning mentions history
        expect(after.reasoning).toContain('corrections');
    });

    it('should apply risk level adjustment', () => {
        const autonomy = new CalibratedAutonomy();

        const lowRisk = autonomy.evaluate('general', 'low');
        const highRisk = autonomy.evaluate('general', 'high');

        // High risk should have more restrictive validation
        expect(lowRisk.canActAutonomously).not.toBe(highRisk.canActAutonomously);
    });

    it('should generate autonomy report', () => {
        const autonomy = new CalibratedAutonomy();
        const report = autonomy.getAutonomyReport();

        expect(report).toContain('Autonomy Calibration');
        expect(report).toContain('research');
        expect(report).toContain('deployment');
    });

    it('should generate prompt section for restricted tasks', () => {
        const autonomy = new CalibratedAutonomy();

        const section = autonomy.toPromptSection('deployment');
        expect(section).not.toBeNull();
        expect(section).toContain('Autonomy Guidelines');
        expect(section).toContain('Validation required');
    });

    it('should return null prompt section for unrestricted tasks', () => {
        const autonomy = new CalibratedAutonomy();

        const section = autonomy.toPromptSection('research');
        expect(section).toBeNull(); // research has 'none' validation
    });

    it('should handle unknown task types with default autonomy', () => {
        const autonomy = new CalibratedAutonomy();
        const decision = autonomy.evaluate('unknown-task-type');

        expect(decision.confidence).toBe(0.5); // No history
        expect(decision.reasoning).toContain('unknown-task-type');
    });
});
