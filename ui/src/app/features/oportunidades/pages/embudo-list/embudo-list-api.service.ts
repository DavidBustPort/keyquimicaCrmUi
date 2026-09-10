import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'

@Injectable({
    providedIn: 'root',
})
export class EmbudoListApiService {
    private http = inject(HttpClient)

    private readonly getEmbudoListUrl = '/api/embudo-list'

    getEmbudoList() {
        return this.http.get(this.getEmbudoListUrl)
    }
}
