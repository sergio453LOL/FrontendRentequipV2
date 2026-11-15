import type { PageResponse, Review, ReviewCreateRequest } from '../types' 
import { api } from './api' 
import { ENDPOINTS } from './endpoints' 

export const reviewService = {  
    /** Reviews a completed reservation; the backend allows one review per reservation, by its renter. */  
    async create(request: ReviewCreateRequest): Promise<Review> {    
        const { data } = await api.post<Review>(ENDPOINTS.reviews, request)    
        return data
    }, 
    
    /** Reviews of one machine, newest first. */ 
    async listForEquipment(equipmentId: number, page = 0, size = 5): Promise<PageResponse<Review>> {
        const { data } = await api.get<PageResponse<Review>>(ENDPOINTS.equipmentReviews(equipmentId), { params: {page, size } }) 
        return data 
    },
}