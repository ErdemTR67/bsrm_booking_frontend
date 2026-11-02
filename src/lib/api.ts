import { appointmentsApi, availabilityApi } from '../features/appointments/api'
import { authApi } from '../features/auth/api'
import { bookingSiteApi } from '../features/booking-site/api'
import { customersApi } from '../features/customers/api'
import { employeeAvailabilityApi, employeesApi, timeOffApi } from '../features/employees/api'
import { locationsApi } from '../features/locations/api'
import { platformApi } from '../features/platform/api'
import { closuresApi, openingHoursApi } from '../features/schedule/api'
import { servicesApi } from '../features/services/api'
import { setupApi } from '../features/setup/api'
import { tenantsApi } from '../features/tenants/api'

export const api = {
  auth: authApi,
  tenants: tenantsApi,
  setup: setupApi,
  bookingSite: bookingSiteApi,
  platform: platformApi,
  locations: locationsApi,
  employees: employeesApi,
  services: servicesApi,
  openingHours: openingHoursApi,
  closures: closuresApi,
  employeeAvailability: employeeAvailabilityApi,
  timeOff: timeOffApi,
  customers: customersApi,
  availability: availabilityApi,
  appointments: appointmentsApi,
}
