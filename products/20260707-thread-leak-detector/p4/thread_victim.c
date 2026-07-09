// Thread-leak victim for on-device P4 validation. Spawns a configurable number of idle threads,
// giving them a wide variety of names so the maintenance log clearly exercises the collector's
// per-thread reporting (hidumper thread summary, run-state table, text stacks). It can grow its
// thread count in two steps (warning band, then fault band) so the warning->fault merge path is
// observable end to end.
//
//   thread_victim <total> <hold_sec> [<phase1> <phase1_hold_sec>]
//
// If phase1 is given, the process first holds <phase1> threads for <phase1_hold_sec> seconds
// (crossing only the warning threshold), then grows to <total> (crossing the fault threshold).
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdio.h>

static void *idle(void *arg)
{
    (void)arg;
    for (;;) {
        sleep(60);
    }
    return NULL;
}

// A pool of human-meaningful base names; each thread gets "<base>_<n>" so names are diverse but
// grouped, which is exactly what the maintenance "Top thread names" summary is meant to surface.
static const char *g_baseNames[] = {
    "TL_Worker", "TL_IO", "TL_Net", "TL_Render", "TL_Audio", "TL_Codec", "TL_GC",
    "TL_Timer", "TL_IPC", "TL_DB", "TL_Cache", "TL_Sensor", "TL_Anim", "TL_Upload",
    "TL_Download", "TL_Parser", "TL_Watchdog", "TL_Event", "TL_Sync", "TL_Log",
};
static const int g_baseCount = (int)(sizeof(g_baseNames) / sizeof(g_baseNames[0]));

static void spawn_threads(int from, int to)
{
    for (int i = from; i < to; i++) {
        pthread_t t;
        if (pthread_create(&t, NULL, idle, NULL) == 0) {
            char name[16];
            (void)snprintf(name, sizeof(name), "%s_%d", g_baseNames[i % g_baseCount], i / g_baseCount);
            pthread_setname_np(t, name);
            pthread_detach(t);
        }
        usleep(1000); // 1ms: stagger creation
    }
}

int main(int argc, char **argv)
{
    int total = (argc > 1) ? atoi(argv[1]) : 150;
    int hold = (argc > 2) ? atoi(argv[2]) : 120;
    int phase1 = (argc > 3) ? atoi(argv[3]) : 0;
    int phase1Hold = (argc > 4) ? atoi(argv[4]) : 0;

    int created = 0;
    if (phase1 > 0 && phase1 < total) {
        spawn_threads(created, phase1);
        created = phase1;
        printf("thread_victim pid=%d phase1_threads=%d\n", (int)getpid(), created + 1);
        fflush(stdout);
        sleep(phase1Hold);
    }
    spawn_threads(created, total);
    printf("thread_victim pid=%d threads=%d\n", (int)getpid(), total + 1);
    fflush(stdout);
    sleep(hold);
    return 0;
}
