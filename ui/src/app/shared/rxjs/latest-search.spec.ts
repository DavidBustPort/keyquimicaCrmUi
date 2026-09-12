import { Observable, Subject } from 'rxjs'
import { latestSearch } from './latest-search'

describe('latestSearch', () => {
	afterEach(() => vi.useRealTimers())
	it('cancels immediately and only starts the final text after 300 ms', () => {
		vi.useFakeTimers()
		const queries = new Subject<string | null>()
		const started: (string | null)[] = []
		const cancelled: (string | null)[] = []
		const subscription = queries
			.pipe(
				latestSearch(
					(q) => q,
					(q) =>
						new Observable(() => {
							started.push(q)
							return () => {
								cancelled.push(q)
							}
						})
				)
			)
			.subscribe()
		queries.next('')
		queries.next('a')
		expect(cancelled).toEqual([''])
		vi.advanceTimersByTime(200)
		queries.next('abc')
		vi.advanceTimersByTime(299)
		expect(started).toEqual([''])
		vi.advanceTimersByTime(1)
		expect(started).toEqual(['', 'abc'])
		queries.next(null)
		expect(cancelled).toEqual(['', 'abc'])
		subscription.unsubscribe()
	})
})
