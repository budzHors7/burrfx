import time


def show_progress(current,
                  total,
                  start_time):

    percent = (current / total) * 100

    elapsed = time.time() - start_time

    if current > 0:

        eta = (elapsed / current) * (total - current)

    else:

        eta = 0

    print(
        f"\rProgress: {percent:.2f}% | ETA: {eta:.1f}s",
        end=""
    )