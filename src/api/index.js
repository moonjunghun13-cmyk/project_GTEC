import axios from 'axios'

// Future transport only. Configure it after the backend contract is agreed.
export const createApiClient = (config) => axios.create(config)
