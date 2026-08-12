#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

/*
 * Bash starts asynchronous children with SIGINT and SIGQUIT ignored when job
 * control is off. An ignored disposition survives exec and cannot be reset by
 * the non-interactive shell that script(1) starts, so Ctrl-C in the nested PTY
 * would be inert. This native boundary restores the dispositions before exec.
 */
int
main(int argc, char **argv)
{
	sigset_t unblocked;
	int exec_errno;

	if (argc < 2) {
		fprintf(stderr, "usage: reset-signals command [argument ...]\n");
		return 64;
	}
	if (signal(SIGINT, SIG_DFL) == SIG_ERR ||
	    signal(SIGQUIT, SIG_DFL) == SIG_ERR) {
		perror("reset-signals: signal");
		return 125;
	}
	if (sigemptyset(&unblocked) == -1 ||
	    sigaddset(&unblocked, SIGINT) == -1 ||
	    sigaddset(&unblocked, SIGQUIT) == -1 ||
	    sigprocmask(SIG_UNBLOCK, &unblocked, NULL) == -1) {
		perror("reset-signals: sigprocmask");
		return 125;
	}
	execvp(argv[1], &argv[1]);
	exec_errno = errno;
	fprintf(stderr, "reset-signals: %s: ", argv[1]);
	perror(NULL);
	return exec_errno == ENOENT ? 127 : 126;
}
