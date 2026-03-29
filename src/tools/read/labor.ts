import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

/**
 * List scheduled shifts and actual time entries for a business date.
 * Resolves employee and job names for a complete roster view.
 */
export const listShiftsTool: ToolDefinition = {
  name: "toast_list_shifts",
  description:
    "List labor data for a business date: scheduled shifts, actual clock in/out " +
    "time entries, employee names, and job roles. Use businessDate in YYYYMMDD format.",
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    businessDate: z
      .string()
      .describe(
        "Business date in YYYYMMDD format (e.g. 20260328)."
      ),
  }),
  async execute(input, { client }) {
    const guid = input.restaurantGuid ?? client.getDefaultRestaurantGuid();
    if (!guid) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No restaurant GUID provided and no default configured.",
          },
        ],
        isError: true,
      };
    }

    const dateStr = input.businessDate;
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = parseInt(dateStr.slice(6, 8), 10);
    const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Fetch employees, jobs, shifts, and time entries in parallel
    const [employees, jobs, shifts, timeEntries] = await Promise.all([
      client
        .get<
          Array<{
            guid: string;
            firstName?: string;
            lastName?: string;
            chosenName?: string;
            deleted?: boolean;
          }>
        >("/labor/v1/employees", undefined, guid)
        .catch(() => [] as Array<{ guid: string; firstName?: string; lastName?: string; chosenName?: string; deleted?: boolean }>),
      client
        .get<
          Array<{
            guid: string;
            title?: string;
            deleted?: boolean;
            tipped?: boolean;
            defaultWage?: number;
            wageFrequency?: string;
          }>
        >("/labor/v1/jobs", undefined, guid)
        .catch(() => [] as Array<{ guid: string; title?: string; deleted?: boolean }>),
      client
        .get<
          Array<{
            guid: string;
            inDate?: string;
            outDate?: string;
            deleted?: boolean;
            employeeReference?: { guid: string };
            jobReference?: { guid: string };
          }>
        >("/labor/v1/shifts", { startDate: startIso, endDate: endIso }, guid)
        .catch(() => [] as Array<{ guid: string; inDate?: string; outDate?: string; deleted?: boolean; employeeReference?: { guid: string }; jobReference?: { guid: string } }>),
      client
        .get<
          Array<{
            guid: string;
            inDate?: string;
            outDate?: string;
            businessDate?: string;
            deleted?: boolean;
            regularHours?: number;
            overtimeHours?: number;
            hourlyWage?: number | null;
            nonCashTips?: number;
            declaredCashTips?: number;
            cashSales?: number;
            nonCashSales?: number;
            autoClockedOut?: boolean;
            employeeReference?: { guid: string };
            jobReference?: { guid: string };
            breaks?: Array<{ inDate?: string; outDate?: string }>;
          }>
        >("/labor/v1/timeEntries", { businessDate: dateStr }, guid)
        .catch(() => [] as Array<{ guid: string; inDate?: string; outDate?: string; businessDate?: string; deleted?: boolean; regularHours?: number; overtimeHours?: number; hourlyWage?: number | null; nonCashTips?: number; declaredCashTips?: number; cashSales?: number; nonCashSales?: number; autoClockedOut?: boolean; employeeReference?: { guid: string }; jobReference?: { guid: string }; breaks?: Array<{ inDate?: string; outDate?: string }> }>),
    ]);

    // Build lookup maps
    const employeeNames = new Map<string, string>();
    for (const emp of Array.isArray(employees) ? employees : []) {
      if (emp.guid) {
        const display = emp.chosenName ?? emp.firstName ?? "";
        const name = [display, emp.lastName].filter(Boolean).join(" ");
        if (name) employeeNames.set(emp.guid, name);
      }
    }

    const jobTitles = new Map<string, string>();
    for (const job of Array.isArray(jobs) ? jobs : []) {
      if (job.guid && job.title && !job.deleted) {
        jobTitles.set(job.guid, job.title);
      }
    }

    // Build scheduled shifts summary
    const scheduledShifts = (Array.isArray(shifts) ? shifts : [])
      .filter((s) => !s.deleted)
      .map((s) => {
        const empGuid = s.employeeReference?.guid;
        const jobGuid = s.jobReference?.guid;
        return {
          guid: s.guid,
          employee: empGuid ? employeeNames.get(empGuid) ?? empGuid : "Unknown",
          job: jobGuid ? jobTitles.get(jobGuid) ?? jobGuid : "Unknown",
          scheduledIn: s.inDate,
          scheduledOut: s.outDate,
        };
      })
      .sort((a, b) => (a.scheduledIn ?? "").localeCompare(b.scheduledIn ?? ""));

    // Build actual time entries summary
    const activeTimeEntries = (Array.isArray(timeEntries) ? timeEntries : [])
      .filter((t) => !t.deleted);

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalLaborCost = 0;
    let totalTips = 0;

    const timeEntrySummaries = activeTimeEntries
      .map((t) => {
        const empGuid = t.employeeReference?.guid;
        const jobGuid = t.jobReference?.guid;
        const regular = t.regularHours ?? 0;
        const overtime = t.overtimeHours ?? 0;
        const wage = t.hourlyWage ?? 0;
        const tips = (t.nonCashTips ?? 0) + (t.declaredCashTips ?? 0);
        const sales = (t.cashSales ?? 0) + (t.nonCashSales ?? 0);
        const laborCost = (regular + overtime * 1.5) * wage;

        totalRegularHours += regular;
        totalOvertimeHours += overtime;
        totalLaborCost += laborCost;
        totalTips += tips;

        return {
          guid: t.guid,
          employee: empGuid ? employeeNames.get(empGuid) ?? empGuid : "Unknown",
          job: jobGuid ? jobTitles.get(jobGuid) ?? jobGuid : "Unknown",
          clockIn: t.inDate,
          clockOut: t.outDate,
          regularHours: Math.round(regular * 100) / 100,
          overtimeHours: Math.round(overtime * 100) / 100,
          hourlyWage: wage,
          laborCost: Math.round(laborCost * 100) / 100,
          tips: Math.round(tips * 100) / 100,
          sales: Math.round(sales * 100) / 100,
          autoClockedOut: t.autoClockedOut ?? false,
        };
      })
      .sort((a, b) => (a.clockIn ?? "").localeCompare(b.clockIn ?? ""));

    return jsonResult({
      businessDate: dateStr,
      scheduled: {
        count: scheduledShifts.length,
        shifts: scheduledShifts,
      },
      actual: {
        count: timeEntrySummaries.length,
        timeEntries: timeEntrySummaries,
      },
      laborSummary: {
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalHours: Math.round((totalRegularHours + totalOvertimeHours) * 100) / 100,
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        employeesWorked: timeEntrySummaries.length,
      },
    });
  },
};
