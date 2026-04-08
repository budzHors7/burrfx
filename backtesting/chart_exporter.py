import matplotlib.pyplot as plt
import datetime


def save_equity_chart(equity,
                      filename):

    plt.figure()

    plt.plot(equity)

    plt.title("Backtest Equity Curve")

    now = datetime.datetime.now()

    output = (

        f"results/{filename}_"
        f"{now.strftime('%Y%m%d_%H%M%S')}.png"

    )

    plt.savefig(output)

    print("\nChart saved:")
    print(output)

    plt.close()