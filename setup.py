"""
AWSMonitor setup
"""
import setuptools

if __name__ == "__main__":
    setuptools.setup(name="AWSMonitor",
        include_package_data=True,
        data_files=[
            (
                "etc/jupyter/jupyter_server_config.d",
                ["jupyter-config/jupyter_server_config.d/AWSMonitor.json"]
            ),
        ])
