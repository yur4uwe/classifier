import numpy as np
from numpy import ndarray
import os
import json
from dotenv import load_dotenv

load_dotenv()

data_directory = os.getenv('DATA_DIRECTORY')
info_directory = os.getenv('INFO_DIRECTORY')

WeatherData = list[list[int | float]]
WeatherTensor = list[list[int | float]]

def reshape_weather(weather_data: WeatherData) -> WeatherTensor:
    result: list[list[int | float]] = [[] for _ in range(24)]

    for time_series in weather_data:
        for hour in range(24):
            result[hour].append(time_series[hour])

    return result

def load_file(file_name: str, pos: bool) -> list:
    if pos:
        outfit = json.load(open(os.path.join(data_directory, "pos", file_name)))
    else:
        outfit = json.load(open(os.path.join(data_directory, "neg", file_name)))

    return outfit

def num_types():
    with open(os.path.join(info_directory, "types_mapping.json")) as f:
        return len(json.load(f).items())

def num_tags():
    with open(os.path.join(info_directory, "tags_mapping.json")) as f:
        return len(json.load(f)["tags"].items())

BATCH_SIZE = 32

def cache_data(weather_data: ndarray, tags_data: ndarray, types_data: ndarray, labels: ndarray):
    np.save(os.path.join(data_directory, "data", "weather.npy"), weather_data)
    np.save(os.path.join(data_directory, "data", "tags.npy"), tags_data)
    np.save(os.path.join(data_directory, "data", "types.npy"), types_data)
    np.save(os.path.join(data_directory, "data", "labels.npy"), labels)

def load_cached_data() -> tuple[ndarray, ndarray, ndarray, ndarray]:
    weather = np.load(os.path.join(data_directory, "data", "weather.npy"))
    tags = np.load(os.path.join(data_directory, "data", "tags.npy"))
    types = np.load(os.path.join(data_directory, "data", "types.npy"))
    labels = np.load(os.path.join(data_directory, "data", "labels.npy"))

    return weather, tags, types, labels

def append_data(is_pos: bool, data_files: list, weather_data: list, tags_data: list, types_data: list, labels: list):
    tags_max_len = 0
    types_max_len = 0

    for file in data_files:
        outfitConditions = load_file(file.name, is_pos)
        # print(outfitConditions[0])
        for outfit in outfitConditions:
            weather_data.append(reshape_weather(outfit[2]))

            outfit_tags = []
            for clothing_tags in outfit[1]:
                tags_max_len = max(tags_max_len, len(clothing_tags))
                outfit_tags.append(clothing_tags)
            tags_data.append(outfit_tags)

            types_data.append(outfit[0])

            labels.append(1 if is_pos else 0)

            types_max_len = max(types_max_len, len(outfit[0]), len(outfit[1]))

        # break

    return tags_max_len, types_max_len

def load_data() -> tuple[ndarray, ndarray, ndarray, ndarray]:
    if os.path.exists(os.path.join(data_directory, "data", "weather.npy")) and \
        os.path.exists(os.path.join(data_directory, "data", "tags.npy")) and \
        os.path.exists(os.path.join(data_directory, "data", "types.npy")) and \
        os.path.exists(os.path.join(data_directory, "data", "labels.npy")):
        return load_cached_data()

    pos_files = list(os.scandir(os.path.join(data_directory, "pos")))
    neg_files = list(os.scandir(os.path.join(data_directory, "neg")))

    weather_data = []
    tags_data = []
    types_data = []
    labels = []

    pos_tags_max_len, pos_types_max_len = append_data(True, pos_files, weather_data, tags_data, types_data, labels)
    neg_tags_max_len, neg_types_max_len = append_data(False, neg_files, weather_data, tags_data, types_data, labels)

    tags_max_len = max(pos_tags_max_len, neg_tags_max_len)
    types_max_len = max(pos_types_max_len, neg_types_max_len)

    for i in range(len(labels)):
        tags_data[i] += [[0] * tags_max_len] * (types_max_len - len(tags_data[i]))
        for j in range(len(tags_data[i])):
            tags_data[i][j] += [0] * (tags_max_len - len(tags_data[i][j]))
        types_data[i] += [0] * (types_max_len - len(types_data[i]))

    return np.array(weather_data), np.array(tags_data), np.array(types_data), np.array(labels)

def diagnostics():
    weather, tags, types, labels = load_data()

    cache_data(weather, tags, types, labels)

    print("Outfits length:", labels.shape)

    print("Positive Outfits:", sum(labels))
    print("Negative Outfits:", len(labels) - sum(labels))

    print("Weather shape:", weather.shape)
    print("Tags shape:", tags.shape)
    print("Types shape:", types.shape)

    print("Weather sample:", weather[0])
    print("Tags sample:", tags[0])
    print("Types sample:", types[0])
    print("Label sample:", labels[0])

    print("Num categories:", num_types() + 1)
    print("Num tags:", num_tags() + 1)
