import os
import platform

def clear_screen():

    if platform.system() == "Windows":
        os.system("cls")
    else:
        os.system("clear")


def pause():

    input("\nPress ENTER to continue...")