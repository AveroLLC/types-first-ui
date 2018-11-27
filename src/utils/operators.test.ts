import { TestScheduler } from 'rxjs/testing';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, take, switchMap } from 'rxjs/operators';
import {
  selector,
  latestBatched,
  reuse,
  memoizedSelector,
  MemoizedSelector,
} from './operators';

interface State {
  n: number;
  m: number;
  s: string;
  selected: keyof State;
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('operators', () => {
  let a$: BehaviorSubject<number>;
  let b$: BehaviorSubject<number>;

  beforeEach(() => {
    a$ = new BehaviorSubject(0);
    b$ = new BehaviorSubject(0);
  });

  describe('latestBatched', () => {
    it('should initialize synchronously', async () => {
      const sum$ = latestBatched([a$, b$]);

      const results = [];
      sum$.subscribe(v => results.push(v));

      expect(results).toEqual([[0, 0]]);
    });

    it('should initialize with the most up-to-date state', async () => {
      const batched$ = latestBatched([a$, b$]);

      const results = [];
      a$.next(1);
      b$.next(2);
      batched$.subscribe(v => results.push(v));

      expect(results).toEqual([[1, 2]]);
    });

    it('should batch synchronous changes', async () => {
      const batched$ = latestBatched([a$, b$]);

      const results = [];
      batched$.subscribe(v => results.push(v));
      expect(results).toEqual([[0, 0]]);

      a$.next(1);
      b$.next(2);

      expect(results).toEqual([[0, 0]]);

      await flush();

      expect(results).toEqual([[0, 0], [1, 2]]);
    });

    it('should propagate changes through an observable chain', async () => {
      const sum$ = latestBatched([a$, b$]).pipe(map(([a, b]) => a + b));
      const difference$ = latestBatched([a$, b$]).pipe(map(([a, b]) => a - b));
      const product$ = latestBatched([sum$, difference$]).pipe(map(([s, d]) => s * d));

      const results = [];
      a$.next(3);
      b$.next(1);
      product$.subscribe(v => results.push(v));

      expect(results).toEqual([8]);

      a$.next(4);
      a$.next(5);

      expect(results).toEqual([8]);
      await flush();

      expect(results).toEqual([8, 24]);
    });
  });

  describe('reuse', () => {
    let subscribeSpy = jest.fn();
    let source$: Observable<number>;

    beforeEach(() => {
      subscribeSpy.mockReset();
      source$ = a$.pipe(tap(subscribeSpy));
    });

    it('should not share a source observable when it is not reused', async () => {
      source$.subscribe();
      source$.subscribe();

      expect(subscribeSpy).toHaveBeenCalledTimes(2);
    });

    it('should not subscribe to the source if there are no subscribers', async () => {
      const reused$ = source$.pipe(reuse());

      expect(subscribeSpy).toHaveBeenCalledTimes(0);
    });

    it('should forward the values from the source', async () => {
      const reused$ = source$.pipe(reuse());

      const value = await reused$.pipe(take(1)).toPromise();

      expect(value).toEqual(0);
    });

    it('should share the source observable across subscribers', async () => {
      const reused$ = source$.pipe(reuse());

      reused$.subscribe();
      reused$.subscribe();

      expect(subscribeSpy).toHaveBeenCalledTimes(1);

      a$.next(1);

      expect(subscribeSpy).toHaveBeenCalledTimes(2);
    });

    it('should replay the most recent value to new subscribers', async () => {
      const reused$ = source$.pipe(reuse());

      reused$.subscribe();
      const value = await reused$.pipe(take(1)).toPromise();

      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(value).toEqual(0);
    });

    it('should unsubscribe from the source when there are no more listeners', async () => {
      const reused$ = source$.pipe(reuse());

      reused$.subscribe().unsubscribe();
      reused$.subscribe().unsubscribe();
      reused$.subscribe().unsubscribe();

      expect(subscribeSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('selector', () => {
    it('should chain correctly', async () => {
      const c$ = new BehaviorSubject<'a' | 'b'>('a');
      const selected$ = selector([c$], switchMap(([c]) => (c == 'a' ? a$ : b$)));

      const sum$ = selector([a$, selected$], map(([a, selected]) => a + selected));

      const results = [];

      a$.next(1);
      b$.next(2);
      sum$.subscribe(v => results.push(v));

      expect(results).toEqual([2]);

      c$.next('b');

      await flush();

      expect(results).toEqual([2, 3]);

      b$.next(3);

      await flush();

      expect(results).toEqual([2, 3, 4]);
    });
  });

  describe('memoize', () => {
    let memoized: MemoizedSelector<[string], string>;

    beforeEach(() => {
      memoized = memoizedSelector((label: string) => {
        return selector([a$], map(([a]) => `${label} world, ${a}`));
      });
    });

    it('should include a cache property', () => {
      expect(memoized._cache).toBeInstanceOf(Map);
      expect(memoized._cache.size).toEqual(0);
    });

    it('should return the selector when invoked', async () => {
      const s$ = memoized('hello');
      const v = await s$.pipe(take(1)).toPromise();
      expect(v).toEqual('hello world, 0');
    });

    it('should return different selectors with different arguments', async () => {
      const hello$ = memoized('hello');
      const hi$ = memoized('hi');
      const v1 = await hello$.pipe(take(1)).toPromise();
      const v2 = await hi$.pipe(take(1)).toPromise();
      expect(v1).toEqual('hello world, 0');
      expect(v2).toEqual('hi world, 0');
    });

    it('should return the same selector when invoked more than once', async () => {
      const hello$ = memoized('hello');
      expect(memoized('hello')).toBe(hello$);
    });

    it('should uncache when the selector is unsubscribed', async () => {
      const hello$ = memoized('hello');
      expect(memoized._cache.size).toBe(1);

      hello$.subscribe().unsubscribe();
      expect(memoized._cache.size).toBe(0);
      expect(memoized('hello')).not.toBe(hello$);
    });

    it('should uncache when the last selector is unsubscribed', async () => {
      const hello$ = memoized('hello');
      expect(memoized._cache.size).toBe(1);

      const s1 = hello$.subscribe();
      const s2 = hello$.subscribe();
      const s3 = hello$.subscribe();
      expect(memoized._cache.size).toBe(1);

      s1.unsubscribe();
      s2.unsubscribe();
      expect(memoized._cache.size).toBe(1);
      expect(memoized('hello')).toBe(hello$);

      s3.unsubscribe();
      expect(memoized._cache.size).toBe(0);
      expect(memoized('hello')).not.toBe(hello$);
    });

    it('should cache correctly with 0 arguments', () => {
      const noArgs = memoizedSelector(() => a$);
      expect(noArgs()).toBe(noArgs());
    });

    it('should cache correctly with multiple arguments', () => {
      const multiArgs = memoizedSelector((s: string, n: number) => a$);
      expect(multiArgs('a', 1)).toBe(multiArgs('a', 1));
      expect(multiArgs('b', 1)).not.toBe(multiArgs('a', 1));
      expect(multiArgs('a', 2)).not.toBe(multiArgs('a', 1));
    });

    it('should cache correctly with complex arguments', () => {
      interface Arg {
        s: string;
        n: number;
        o: { d: Date };
      }
      const objectArgs = memoizedSelector((a: Arg) => a$);
      expect(objectArgs({ s: 'a', n: 1, o: { d: new Date(0) } })).toBe(
        objectArgs({ s: 'a', n: 1, o: { d: new Date(0) } })
      );
      expect({ s: 'b', n: 1, o: { d: new Date(0) } }).not.toBe(
        objectArgs({ s: 'a', n: 1, o: { d: new Date(0) } })
      );

      expect({ s: 'a', n: 2, o: { d: new Date(0) } }).not.toBe(
        objectArgs({ s: 'a', n: 1, o: { d: new Date(0) } })
      );

      expect({ s: 'a', n: 1, o: { d: new Date(1) } }).not.toBe(
        objectArgs({ s: 'a', n: 1, o: { d: new Date(0) } })
      );
    });
  });
});
