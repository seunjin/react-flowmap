import { attachFetchInterceptor } from './collector/fetch-interceptor.js';
import type { RuntimeCollector } from './collector/collector.js';
import type { RuntimeSession } from './tracing/runtime-session.js';

type AcquireRuntimeOptions = {
  enableFetchInterceptor: boolean;
};

type RuntimeLease = {
  collector: RuntimeCollector;
  release: () => void;
};

export class FlowmapRuntimeManager {
  private activeConsumers = 0;
  private fetchInterceptorConsumers = 0;
  private detachFetchInterceptor: (() => void) | null = null;

  constructor(
    private readonly collector: RuntimeCollector,
    private readonly session: RuntimeSession,
  ) {}

  acquire({ enableFetchInterceptor }: AcquireRuntimeOptions): RuntimeLease {
    this.activeConsumers += 1;

    if (enableFetchInterceptor) {
      this.fetchInterceptorConsumers += 1;

      if (!this.detachFetchInterceptor) {
        this.detachFetchInterceptor = attachFetchInterceptor({
          collector: this.collector,
          getContext: () => this.session.getContext(),
        });
      }
    }

    let released = false;

    return {
      collector: this.collector,
      release: () => {
        if (released) {
          return;
        }

        released = true;
        this.activeConsumers = Math.max(0, this.activeConsumers - 1);

        if (enableFetchInterceptor) {
          this.fetchInterceptorConsumers = Math.max(0, this.fetchInterceptorConsumers - 1);

          if (this.fetchInterceptorConsumers === 0 && this.detachFetchInterceptor) {
            this.detachFetchInterceptor();
            this.detachFetchInterceptor = null;
          }
        }

        if (this.activeConsumers === 0) {
          this.collector.reset();
        }
      },
    };
  }
}
