export type SetupStepKey = 'location' | 'opening_hours' | 'service' | 'employee' | 'employee_service' | 'employee_availability'
export type SetupStep = { key: SetupStepKey; complete: boolean }
export type SetupStatus = {
  is_complete: boolean
  progress_percent: number
  next_step: SetupStepKey | null
  steps: SetupStep[]
}
