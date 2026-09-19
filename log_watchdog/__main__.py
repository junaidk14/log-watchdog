import uvicorn


def main() -> None:
    uvicorn.run("log_watchdog.app:create_app", factory=True, host="127.0.0.1", port=8000, workers=1)


if __name__ == "__main__":
    main()
