import { defer, Observable, OperatorFunction, switchMap, timer } from 'rxjs'

/** Cancels immediately; delays only changes to the search text. */
export function latestSearch<T, R>(text: (query: T) => string | null, request: (query: T) => Observable<R>): OperatorFunction<T, R> {
	return (source) =>
		defer(() => {
			let previous: string | null = null
			return source.pipe(
				switchMap((query) => {
					const current = text(query)
					const wait = current !== null && previous !== null && current !== previous
					previous = current
					return wait ? timer(300).pipe(switchMap(() => request(query))) : request(query)
				})
			)
		})
}
