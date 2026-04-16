import tensorflow as tf
import tensorflow_transform as tft
from tfx.components.trainer.fn_args_utils import FnArgs


def _input_fn(file_pattern, tf_transform_output, batch_size=64):
    # Example TFRecordDataset input function using transformed features
    transformed_feature_spec = (
        tf_transform_output.transformed_feature_spec().copy()
    )
    dataset = tf.data.experimental.make_batched_features_dataset(
        file_pattern,
        batch_size,
        transformed_feature_spec,
        reader=tf.data.TFRecordDataset,
        label_key='label',  # Adjust label key as needed
    )
    return dataset

def _build_keras_model():
    inputs = tf.keras.Input(shape=(10,), name='features')  # example shape
    x = tf.keras.layers.Dense(64, activation='relu')(inputs)
    outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
    model = tf.keras.Model(inputs=inputs, outputs=outputs)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def run_fn(fn_args: FnArgs):
    tf_transform_output = tft.TFTransformOutput(fn_args.transform_output)
    train_dataset = _input_fn(fn_args.train_files, tf_transform_output)
    eval_dataset = _input_fn(fn_args.eval_files, tf_transform_output)

    model = _build_keras_model()
    model.fit(train_dataset, validation_data=eval_dataset, epochs=5)
    model.save(fn_args.serving_model_dir, save_format='tf')
